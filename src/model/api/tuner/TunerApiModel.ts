import { inject, injectable } from 'inversify';
import * as apid from '../../../../api';
import * as mapid from '../../../../node_modules/mirakurun/api';
import IMirakurunClientModel from '../../IMirakurunClientModel';
import ITunerApiModel from './ITunerApiModel';

@injectable()
export default class TunerApiModel implements ITunerApiModel {
    // Mirakurun への照会を 1 本化するための cache TTL
    // (複数 browser tab からの polling を tab 数非依存の有界な負荷に抑える)
    private static readonly CACHE_TTL = 10 * 1000;

    private mirakurunClientModel: IMirakurunClientModel;
    private cache: apid.TunerStatusItem[] | null = null;
    private cacheCreatedAt: number = 0;
    private inflight: Promise<apid.TunerStatusItem[]> | null = null;

    constructor(@inject('IMirakurunClientModel') mirakurunClientModel: IMirakurunClientModel) {
        this.mirakurunClientModel = mirakurunClientModel;
    }

    /**
     * チューナー状態一覧の取得 (TTL 内は cache を返す. 併発要求は同一の照会へ相乗りする)
     * @return Promise<apid.TunerStatusItem[]>
     */
    public async getAll(): Promise<apid.TunerStatusItem[]> {
        const now = new Date().getTime();
        if (this.cache !== null && now - this.cacheCreatedAt < TunerApiModel.CACHE_TTL) {
            return this.cache;
        }

        if (this.inflight !== null) {
            return this.inflight;
        }

        this.inflight = (async () => {
            try {
                const tuners = await this.mirakurunClientModel.getClient().getTuners();
                const result = tuners.map(tuner => this.convertToTunerStatusItem(tuner));
                this.cache = result;
                this.cacheCreatedAt = new Date().getTime();

                return result;
            } finally {
                this.inflight = null;
            }
        })();

        return this.inflight;
    }

    /**
     * mapid.TunerDevice を apid.TunerStatusItem へ変換する
     * @param tuner: mapid.TunerDevice
     * @return apid.TunerStatusItem
     */
    private convertToTunerStatusItem(tuner: mapid.TunerDevice): apid.TunerStatusItem {
        return {
            index: tuner.index,
            name: tuner.name,
            types: tuner.types as apid.ChannelType[],
            isAvailable: tuner.isAvailable,
            isFree: tuner.isFree,
            isUsing: tuner.isUsing,
            isFault: tuner.isFault,
            users: tuner.users.map(user => {
                const item: apid.TunerStatusUser = {
                    id: user.id,
                    priority: user.priority,
                };
                if (typeof user.agent === 'string') {
                    item.agent = user.agent;
                }

                return item;
            }),
        };
    }
}
