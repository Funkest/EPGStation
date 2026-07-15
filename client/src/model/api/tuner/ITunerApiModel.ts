import * as apid from '../../../../../api';

export default interface ITunerApiModel {
    getAll(): Promise<apid.TunerStatusItem[]>;
}
