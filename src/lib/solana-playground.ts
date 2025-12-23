const PLAYGROUND_API_URL = "https://api.solpg.io";

export interface BuildOutput {
    programId: string;
    idl: any;
    uuid: string;
    elf: Buffer; // Deployable bytecode
}

export class SolanaPlayground {

    /**
     * Compiles an Anchor program using Solana Playground's remote compiler.
     * @param libRsContent The content of lib.rs
     */
    static async compile(libRsContent: string): Promise<BuildOutput> {
        // 1. Create a simpler compilation request (mocking PG behavior for now as public API docs are sparse)
        // In reality, PG expects a file structure. We will assume a single-file Anchor program for MVP.

        const response = await fetch(`${PLAYGROUND_API_URL}/build`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                files: [
                    ["src/lib.rs", libRsContent],
                    ["Anchor.toml", `[programs.localnet]
my_program = "11111111111111111111111111111111"

[workspace]
members = ["."]
`]
                ],
                uuid: null,
                flags: {
                    seedsFeature: false,
                    noDocs: true,
                    safetyChecks: false
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Compilation Failed: ${error}`);
        }

        const data = await response.json();
        return {
            programId: data.programId,
            idl: data.idl,
            uuid: data.uuid,
            elf: Buffer.from(data.elf, 'base64')
        };
    }
}
