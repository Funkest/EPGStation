import { Operation } from 'express-openapi';
import IRecordingApiModel from '../../../../api/recording/IRecordingApiModel';
import container from '../../../../ModelContainer';
import * as api from '../../../api';

export const put: Operation = async (req, res) => {
    const recordingApiModel = container.get<IRecordingApiModel>('IRecordingApiModel');

    try {
        await recordingApiModel.stop(parseInt(req.params.recordedId, 10));
        api.responseJSON(res, 200, { code: 200 });
    } catch (err: any) {
        api.responseServerError(res, err.message);
    }
};

put.apiDoc = {
    summary: '録画中断',
    tags: ['recording'],
    description: '録画ファイルを残して録画を中断する',
    parameters: [
        {
            $ref: '#/components/parameters/PathRecordedId',
        },
    ],
    responses: {
        200: {
            description: '録画を中断しました',
        },
        default: {
            description: '予期しないエラー',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error',
                    },
                },
            },
        },
    },
};
