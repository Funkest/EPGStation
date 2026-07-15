export interface TunerTypeSummary {
    type: string;
    total: number;
    using: number;
    hasFault: boolean;
}

export default interface ITunerStatusState {
    fetchData(): Promise<void>;
    getSummaries(): TunerTypeSummary[];
    getRecordingCount(): number;
    isError(): boolean;
}
