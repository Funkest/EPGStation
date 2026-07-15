<template>
    <v-dialog v-model="dialogModel" max-width="420" scrollable>
        <v-card>
            <v-card-text class="pa-4">
                <div class="subtitle-1 font-weight-bold error--text">チューナー競合のため予約できません</div>
                <div v-if="isLoading === true" class="body-2 mt-2">競合情報を確認中...</div>
                <template v-else>
                    <div v-if="isError === true" class="body-2 mt-2">競合情報の取得に失敗しました。対象時間帯のチューナーに空きがありません。</div>
                    <template v-else>
                        <div class="body-2 mt-2 text--primary">{{ summaryText }}</div>
                        <div v-if="overlaps.length > 0" class="mt-2">
                            <div class="caption font-weight-bold">同時間帯の予約</div>
                            <div v-for="item in overlaps" v-bind:key="item.id" class="caption">・{{ item.time }} {{ item.name }}</div>
                        </div>
                    </template>
                </template>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" text v-on:click="dialogModel = false">閉じる</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import IReservesApiModel from '@/model/api/reserves/IReservesApiModel';
import ITunerApiModel from '@/model/api/tuner/ITunerApiModel';
import IChannelModel from '@/model/channels/IChannelModel';
import container from '@/model/ModelContainer';
import DateUtil from '@/util/DateUtil';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

interface OverlapReserveItem {
    id: number;
    name: string;
    time: string;
}

@Component({})
export default class ReserveConflictDialog extends Vue {
    @Prop({ required: true })
    public isOpen!: boolean;

    @Prop({ required: true })
    public startAt!: number;

    @Prop({ required: true })
    public endAt!: number;

    @Prop({ required: true })
    public channelId!: number;

    public isLoading: boolean = false;
    public isError: boolean = false;
    public summaryText: string = '';
    public overlaps: OverlapReserveItem[] = [];

    private tunerApiModel = container.get<ITunerApiModel>('ITunerApiModel');
    private reservesApiModel = container.get<IReservesApiModel>('IReservesApiModel');
    private channelModel = container.get<IChannelModel>('IChannelModel');

    /**
     * Prop で受け取った isOpen を直接は書き換えられないので
     * getter, setter を用意する
     */
    get dialogModel(): boolean {
        return this.isOpen;
    }
    set dialogModel(value: boolean) {
        this.$emit('update:isOpen', value);
    }

    @Watch('isOpen', { immediate: true })
    public onChangeState(newState: boolean, oldState: boolean): void {
        if (newState === true && !!oldState === false) {
            this.fetchConflictInfo();
        }
    }

    /**
     * 競合情報 (チューナー総数と同時間帯の予約一覧) を取得する
     */
    private async fetchConflictInfo(): Promise<void> {
        this.isLoading = true;
        this.isError = false;
        this.summaryText = '';
        this.overlaps = [];

        try {
            const channel = this.channelModel.findChannel(this.channelId, true);
            const channelType = channel === null ? null : channel.channelType;

            const [tuners, reserves] = await Promise.all([
                this.tunerApiModel.getAll(),
                this.reservesApiModel.gets({
                    type: 'normal',
                    isHalfWidth: true,
                    offset: 0,
                    limit: 1000,
                }),
            ]);

            // 対象波種別を扱える tuner 数
            const tunerTotal = channelType === null ? tuners.length : tuners.filter(t => t.types.indexOf(channelType) !== -1).length;

            // 対象時間帯に重なる同一波種別の予約
            const overlapItems = reserves.reserves.filter(r => {
                if (r.startAt >= this.endAt || r.endAt <= this.startAt) {
                    return false;
                }
                if (channelType === null) {
                    return true;
                }
                const c = this.channelModel.findChannel(r.channelId, true);

                return c !== null && c.channelType === channelType;
            });

            this.overlaps = overlapItems.map(r => {
                const start = DateUtil.getJaDate(new Date(r.startAt));
                const end = DateUtil.getJaDate(new Date(r.endAt));

                return {
                    id: r.id,
                    name: r.name,
                    time: DateUtil.format(start, 'MM/dd(w) hh:mm ~ ') + DateUtil.format(end, 'hh:mm'),
                };
            });

            const typeText = channelType === null ? '' : `${channelType} `;
            this.summaryText = `${typeText}チューナー ${tunerTotal} 本に対し、対象時間帯に ${overlapItems.length} 件の予約があります。`;
        } catch (err) {
            this.isError = true;
            console.error(err);
        }

        this.isLoading = false;
    }
}
</script>
