export interface LaunchParams {
  readonly files?: readonly FileSystemFileHandle[]
}

export interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void
}

declare global {
  interface Window {
    readonly launchQueue?: LaunchQueue
  }
}

/**
 * Files opened through the PWA file handler ("Open with Xolio") arrive as
 * FileSystemFileHandle values. A handle can be revoked between launch and read,
 * so failures are skipped instead of aborting the whole launch.
 */
export async function filesFromLaunch(params: LaunchParams): Promise<File[]> {
  const files: File[] = []
  for (const handle of params.files ?? []) {
    try {
      files.push(await handle.getFile())
    } catch {
      // Skip revoked or unreadable handles.
    }
  }
  return files
}
