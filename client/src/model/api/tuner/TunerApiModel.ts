import { inject, injectable } from 'inversify';
import * as apid from '../../../../../api';
import IRepositoryModel from '../IRepositoryModel';
import ITunerApiModel from './ITunerApiModel';

@injectable()
export default class TunerApiModel implements ITunerApiModel {
    private repository: IRepositoryModel;

    constructor(@inject('IRepositoryModel') repository: IRepositoryModel) {
        this.repository = repository;
    }

    /**
     * チューナー状態一覧の取得
     * @return Promise<apid.TunerStatusItem[]>
     */
    public async getAll(): Promise<apid.TunerStatusItem[]> {
        const result = await this.repository.get('/tuners');

        return result.data;
    }
}
