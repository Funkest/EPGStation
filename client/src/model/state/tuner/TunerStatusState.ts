import { inject, injectable } from 'inversify';
import IRecordingApiModel from '../../api/recording/IRecordingApiModel';
import ITunerApiModel from '../../api/tuner/ITunerApiModel';
import ITunerStatusState, { TunerTypeSummary } from './ITunerStatusState';

// 表示順 (これに含まれない波種別は末尾へ追加される)
const TYPE_ORDER = ['GR', 'BS', 'CS', 'SKY'];

@injectable()
export default class TunerStatusState implements ITunerStatusState {
    private tunerApiModel: ITunerApiModel;
    private recordingApiModel: IRecordingApiModel;
    private summaries: TunerTypeSummary[] = [];
    private recordingCount: number = 0;
    private isFetchError: boolean = false;

    constructor(@inject('ITunerApiModel') tunerApiModel: ITunerApiModel, @inject('IRecordingApiModel') recordingApiModel: IRecordingApiModel) {
        this.tunerApiModel = tunerApiModel;
        this.recordingApiModel = recordingApiModel;
    }

    /**
     * チューナー状態と録画中件数を取得し, 波種別ごとに集計する
     */
    public async fetchData(): Promise<void> {
        try {
            const [tuners, recordings] = await Promise.all([this.tunerApiModel.getAll(), this.recordingApiModel.gets({ isHalfWidth: true, offset: 0, limit: 1 })]);

            const index: { [type: string]: TunerTypeSummary } = {};
            for (const tuner of tuners) {
                for (const type of tuner.types) {
                    if (typeof index[type] === 'undefined') {
                        index[type] = {
                            type: type,
                            total: 0,
                            using: 0,
                            hasFault: false,
                        };
                    }
                    index[type].total++;
                    if (tuner.isUsing === true) {
                        index[type].using++;
                    }
                    if (tuner.isFault === true) {
                        index[type].hasFault = true;
                    }
                }
            }

            const types = Object.keys(index).sort((a, b) => {
                const ai = TYPE_ORDER.indexOf(a);
                const bi = TYPE_ORDER.indexOf(b);

                return (ai === -1 ? TYPE_ORDER.length : ai) - (bi === -1 ? TYPE_ORDER.length : bi);
            });

            this.summaries = types.map(t => index[t]);
            this.recordingCount = recordings.total;
            this.isFetchError = false;
        } catch (err) {
            this.isFetchError = true;
            throw err;
        }
    }

    public getSummaries(): TunerTypeSummary[] {
        return this.summaries;
    }

    public getRecordingCount(): number {
        return this.recordingCount;
    }

    public isError(): boolean {
        return this.isFetchError;
    }
}
