export type PipelineStage<Context> = {
    id: string
    enabled?: (context: Context) => boolean
    run: (context: Context) => Promise<void> | void
    onError?: (error: unknown, context: Context) => void
}

export async function runPipeline<Context>(
    context: Context,
    stages: PipelineStage<Context>[]
): Promise<void> {
    for (const stage of stages) {
        if (stage.enabled && !stage.enabled(context)) {
            continue
        }

        try {
            await stage.run(context)
        } catch (error) {
            if (stage.onError) {
                stage.onError(error, context)
                continue
            }
            throw error
        }
    }
}
