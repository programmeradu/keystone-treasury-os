import type { ExecutionContext, IAgent, AgentError, ExecutionStep, AgentConfig, ProgressCallback } from "./types";
import { ExecutionStatus, ErrorSeverity } from "./types";

/**
 * Abstract Base Agent - provides common functionality for all agents
 */
export abstract class BaseAgent implements IAgent {
  abstract name: string;
  protected config: AgentConfig;
  protected progressCallback?: ProgressCallback;

  constructor(config: AgentConfig, progressCallback?: ProgressCallback) {
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * Main execute method - wraps execution with error handling and retry logic
   */
  async execute(context: ExecutionContext, input: any): Promise<ExecutionContext> {
    const stepId = `${this.name}-${Date.now()}`;
    const step: ExecutionStep = {
      id: stepId,
      name: this.name,
      status: ExecutionStatus.RUNNING,
      timestamp: Date.now()
    };

    let retryCount = 0;
    const maxRetries = this.config.retryConfig.maxRetries;

    while (retryCount <= maxRetries) {
      try {
        // Validate input before executing
        const isValid = await this.validate(context, input);
        if (!isValid) {
          throw new Error(`Validation failed for ${this.name}`);
        }

        // Execute the agent-specific logic
        const timeout = this.createTimeout(this.config.timeout);
        const result = await Promise.race([
          this.executeAgent(context, input),
          timeout
        ]);

        // Update context with successful result
        step.status = ExecutionStatus.SUCCESS;
        step.result = result;
        step.duration = Date.now() - step.timestamp;

        context.steps.push(step);
        this.updateProgress(context);

        return context;
      } catch (error: any) {
        retryCount++;
        const isRetryable = this.isRetryableError(error);
        const hasRetriesLeft = retryCount <= maxRetries;

        if (isRetryable && hasRetriesLeft) {
          // Calculate backoff delay
          const delayMs = this.calculateBackoffDelay(retryCount);
          await this.delay(delayMs);
          continue;
        }

        // If not retryable or no retries left, add error and return
        const agentError = this.createError(
          error,
          isRetryable,
          retryCount,
          maxRetries
        );

        step.status = ExecutionStatus.FAILED;
        step.error = agentError;
        step.duration = Date.now() - step.timestamp;

        context.steps.push(step);
        context.errors.push(agentError);
        context.state = ExecutionStatus.FAILED;

        this.updateProgress(context);
        throw error;
      }
    }

    throw new Error(`Max retries exceeded for ${this.name}`);
  }

  /**
   * Abstract method - implement in subclass
   */
  abstract executeAgent(context: ExecutionContext, input: any): Promise<any>;

  /**
   * Validate input - override in subclass if needed
   */
  async validate(context: ExecutionContext, input: any): Promise<boolean> {
    return !!input;
  }

  /**
   * Create an error object with context
   */
  protected createError(
    error: any,
    retryable: boolean,
    retryCount: number,
    maxRetries: number
  ): AgentError {
    return {
      code: error.code || "UNKNOWN_ERROR",
      message: error.message || String(error),
      severity: retryable ? ErrorSeverity.WARNING : ErrorSeverity.ERROR,
      timestamp: Date.now(),
      context: {
        agent: this.name,
        errorDetails: error
      },
      retryable,
      retryCount,
      maxRetries
    };
  }

  /**
   * Determine if an error is retryable
   */
  protected isRetryableError(error: any): boolean {
    const retryableMessages = [
      "timeout",
      "econnrefused",
      "econnreset",
      "etimedout",
      "rate limit",
      "429"
    ];

    const errorMessage = (error.message || "").toLowerCase();
    return retryableMessages.some((msg) => errorMessage.includes(msg));
  }

  /**
   * Calculate exponential backoff delay
   */
  protected calculateBackoffDelay(retryCount: number): number {
    const { initialDelayMs, maxDelayMs, backoffMultiplier } =
      this.config.retryConfig;
    const delay = Math.min(
      initialDelayMs * Math.pow(backoffMultiplier, retryCount - 1),
      maxDelayMs
    );
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.max(0, delay + jitter);
  }

  /**
   * Create a timeout promise
   */
  protected createTimeout(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Agent ${this.name} timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    );
  }

  /**
   * Delay helper
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update progress via callback
   */
  protected updateProgress(context: ExecutionContext): void {
    if (this.progressCallback) {
      this.progressCallback(context);
    }
  }

  /**
   * Add step to context
   */
  protected addStep(
    context: ExecutionContext,
    name: string,
    result?: any,
    error?: AgentError
  ): void {
    const step: ExecutionStep = {
      id: `${this.name}-step-${Date.now()}`,
      name,
      status: error ? ExecutionStatus.FAILED : ExecutionStatus.SUCCESS,
      timestamp: Date.now(),
      result,
      error
    };
    context.steps.push(step);
  }

  /**
   * Log to shared context data
   */
  protected setContextData(
    context: ExecutionContext,
    key: string,
    value: any
  ): void {
    context.data[`${this.name}:${key}`] = value;
  }

  /**
   * Retrieve from shared context data
   */
  protected getContextData(context: ExecutionContext, key: string): any {
    return context.data[`${this.name}:${key}`];
  }
}
