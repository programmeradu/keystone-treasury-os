export interface PluginOperation {
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export interface KeystonePlugin {
    id: string;
    name: string;
    description: string;
    programId: string;
    operations: PluginOperation[];
    isLearned: boolean;
    registeredAt: number;
}

class UniversalPluginRegistry {
    private plugins: KeystonePlugin[] = [];

    constructor() {
        // Initialize with core system plugins if any
    }

    register(plugin: Omit<KeystonePlugin, "id" | "registeredAt">) {
        const newPlugin: KeystonePlugin = {
            ...plugin,
            id: `plugin_${Math.random().toString(36).substr(2, 9)}`,
            registeredAt: Date.now()
        };
        this.plugins.push(newPlugin);
        console.log(`[PluginRegistry] Registered: ${newPlugin.name} (${newPlugin.programId})`);
        return newPlugin;
    }

    getPlugins() {
        return this.plugins;
    }

    getOperations() {
        return this.plugins.flatMap(p => p.operations.map(op => ({
            ...op,
            pluginId: p.id,
            programId: p.programId
        })));
    }

    findOperation(opName: string) {
        return this.getOperations().find(op => op.name.toLowerCase() === opName.toLowerCase());
    }

    remove(id: string) {
        this.plugins = this.plugins.filter(p => p.id !== id);
    }
}

// Singleton for the app session
export const PluginRegistry = new UniversalPluginRegistry();
