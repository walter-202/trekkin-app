import type { ExportTrackResult } from '../activity/ExportTrackFile.usecase';

export interface ShareGpxFilePorts {
  isAvailable: () => Promise<boolean>;
  writeFile: (fileName: string, content: string) => Promise<string>;
  shareFile: (uri: string, mimeType: string) => Promise<void>;
}

/** Write before sharing; never substitute XML text for a file attachment. */
export async function ShareGpxFileUseCase(
  file: ExportTrackResult,
  ports: ShareGpxFilePorts,
): Promise<void> {
  if (!(await ports.isAvailable())) {
    throw new Error('No se pueden compartir archivos en este dispositivo.');
  }
  const uri = await ports.writeFile(file.fileName, file.content);
  await ports.shareFile(uri, file.mimeType);
}
