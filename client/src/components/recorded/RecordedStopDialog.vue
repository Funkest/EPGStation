<template>
    <v-dialog v-if="isRemove === false" v-model="dialogModel" max-width="300" scrollable>
        <v-card>
            <div class="pa-4 pb-0">
                <div class="text--primary">{{ recordedItem.name }} の録画を中断しますか?</div>
                <div class="caption py-2">録画ファイルは残ります。</div>
            </div>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" text v-on:click="dialogModel = false">キャンセル</v-btn>
                <v-btn color="primary" text v-on:click="stopRecording">中断</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import IRecordingApiModel from '@/model/api/recording/IRecordingApiModel';
import container from '@/model/ModelContainer';
import ISnackbarState from '@/model/state/snackbar/ISnackbarState';
import Util from '@/util/Util';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import * as apid from '../../../../api';

@Component({})
export default class RecordedStopDialog extends Vue {
    @Prop({ required: true })
    public recordedItem!: apid.RecordedItem;

    @Prop({ required: true })
    public isOpen!: boolean;

    public isRemove: boolean = false;

    private recordingApiModel = container.get<IRecordingApiModel>('IRecordingApiModel');
    private snackbarState = container.get<ISnackbarState>('ISnackbarState');

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
        if (newState === false && oldState === true) {
            // close
            this.$nextTick(async () => {
                await Util.sleep(100);
                // dialog close アニメーションが終わったら要素を削除する
                this.isRemove = true;
                this.$nextTick(() => {
                    this.isRemove = false;
                });
            });
        }
    }

    /**
     * 録画中断
     */
    public async stopRecording(): Promise<void> {
        this.dialogModel = false;

        try {
            await this.recordingApiModel.stop(this.recordedItem.id);
            this.snackbarState.open({
                color: 'success',
                text: `${this.recordedItem.name} の録画を中断`,
            });
        } catch (err) {
            this.snackbarState.open({
                color: 'error',
                text: `${this.recordedItem.name} の録画中断に失敗`,
            });
            console.error(err);
        }
    }
}
</script>
