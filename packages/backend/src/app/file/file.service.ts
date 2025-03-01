import { ActivepiecesError, apId, ErrorCode, File, FileCompression, FileId, FileType, ProjectId } from '@activepieces/shared'
import { isNil } from '@activepieces/shared'
import { databaseConnection } from '../database/database-connection'
import { logger } from '../helper/logger'
import { FileEntity } from './file.entity'
import { fileCompressor } from './utils/file-compressor'

type SaveParams = {
    fileId?: FileId | undefined
    projectId: ProjectId
    data: Buffer
    type: FileType
    compression: FileCompression
}

type BaseOneParams = {
    fileId: FileId
    projectId: ProjectId
}

type GetOneParams = BaseOneParams

type DeleteOneParams = BaseOneParams

const fileRepo = databaseConnection.getRepository<File>(FileEntity)

export const fileService = {
    async save({ fileId, projectId, data, type, compression }: SaveParams): Promise<File> {
        const file = {
            id: fileId ?? apId(),
            projectId,
            data,
            type,
            compression,
        }

        const savedFile = await fileRepo.save(file)

        logger.info(`[FileService#save] fileId=${savedFile.id} data.length=${data.length}`)

        return savedFile
    },

    async getOne({ projectId, fileId }: GetOneParams): Promise<File | null> {
        const file = await fileRepo.findOneBy({
            projectId,
            id: fileId,
        })

        if (isNil(file)) {
            return null
        }

        const decompressedData = await fileCompressor.decompress({
            data: file.data,
            compression: file.compression,
        })

        file.data = decompressedData
        return file
    },

    async getOneOrThrow(params: GetOneParams): Promise<File> {
        const file = await this.getOne(params)

        if (isNil(file)) {
            throw new ActivepiecesError({
                code: ErrorCode.FILE_NOT_FOUND,
                params: {
                    id: params.fileId,
                },
            })
        }

        return file
    },

    async delete({ fileId, projectId }: DeleteOneParams): Promise<void> {
        logger.info('Deleted file with Id ' + fileId)
        await fileRepo.delete({ id: fileId, projectId })
    },
}
