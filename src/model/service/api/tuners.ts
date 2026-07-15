import { Operation } from 'express-openapi';
import ITunerApiModel from '../../api/tuner/ITunerApiModel';
import container from '../../ModelContainer';
import * as api from '../api';

export const get: Operation = async (_req, res) => {
    const tunerApiModel = container.get<ITunerApiModel>('ITunerApiModel');

    try {
        const tuners = await tunerApiModel.getAll();
        api.responseJSON(res, 200, tuners);
    } catch (err: any) {
        api.responseServerError(res, err.message);
    }
};

get.apiDoc = {
    summary: 'チューナー状態取得',
    tags: ['tuners'],
    description: 'チューナー状態を取得する',
    responses: {
        200: {
            description: 'チューナー状態を取得しました',
            content: {
                'application/json': {
                    schema: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/TunerStatusItem',
                        },
                    },
                },
            },
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
