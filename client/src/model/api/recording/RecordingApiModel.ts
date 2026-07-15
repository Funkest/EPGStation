import { inject, injectable } from 'inversify';
import * as apid from '../../../../../api';
import IRepositoryModel from '../IRepositoryModel';
import IRecordingApiModel from './IRecordingApiModel';

@injectable()
export default class RecordingApiModel implements IRecordingApiModel {
    private repository: IRepositoryModel;

    constructor(@inject('IRepositoryModel') repository: IRepositoryModel) {
        this.repository = repository;
    }

    /**
     * 録画情報の取得
     * @param option: GetRecordedOption
     * @return Promise<apid.Records>
     */
    public async gets(option: apid.GetRecordedOption): Promise<apid.Records> {
        const result = await this.repository.get('/recording', {
            params: option,
        });

        return result.data;
    }

    /**
     * 録画中断 (録画ファイルを残して停止する)
     * @param recordedId: apid.RecordedId
     * @return Promise<void>
     */
    public async stop(recordedId: apid.RecordedId): Promise<void> {
        await this.repository.put(`/recording/${recordedId}/stop`);
    }
}
