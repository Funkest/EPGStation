<template>
    <v-navigation-drawer
        v-model="navigationState.openState"
        :clipped="navigationState.isClipped"
        :permanent="navigationState.type === 'permanent'"
        :temporary="navigationState.type === 'temporary'"
        app
        overflow
    >
        <v-list-item>
            <v-list-item-content>
                <v-list-item-title class="title">{{ versionState.getVersionString() }}</v-list-item-title>
            </v-list-item-content>
        </v-list-item>

        <v-list dense>
            <v-list-item-group multiple :max="0">
                <v-list-item
                    v-for="(item, index) in navigationState.items"
                    :key="item.id"
                    link
                    :disabled="item.herf === null"
                    v-on:click="route(item)"
                    v-bind:class="getNavigationItemClass(index)"
                >
                    <v-list-item-icon>
                        <v-icon>{{ item.icon }}</v-icon>
                    </v-list-item-icon>

                    <v-list-item-content>
                        <v-list-item-title>{{ item.title }}</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list-item-group>
        </v-list>
        <div class="list-dummy"></div>

        <template v-slot:append>
            <div class="tuner-status px-4 py-2">
                <div class="caption font-weight-bold">チューナー</div>
                <div v-if="tunerStatusState.isError() === true" class="caption text--secondary">取得失敗</div>
                <div v-else-if="tunerStatusState.getSummaries().length === 0" class="caption text--secondary">情報なし</div>
                <div v-else class="d-flex flex-wrap">
                    <span
                        v-for="summary in tunerStatusState.getSummaries()"
                        :key="summary.type"
                        class="caption mr-2"
                        v-bind:class="{
                            'error--text font-weight-bold': summary.hasFault === true,
                            'primary--text font-weight-bold': summary.hasFault === false && summary.using > 0,
                        }"
                    >
                        {{ summary.type }} {{ summary.using }}/{{ summary.total }}
                    </span>
                </div>
                <div v-if="tunerStatusState.getRecordingCount() > 0" class="caption error--text font-weight-bold">録画中 {{ tunerStatusState.getRecordingCount() }}件</div>
            </div>
        </template>
    </v-navigation-drawer>
</template>

<script lang="ts">
import container from '@/model/ModelContainer';
import IServerConfigModel from '@/model/serverConfig/IServerConfigModel';
import INavigationState from '@/model/state/navigation/INavigationState';
import ISocketIOModel from '@/model/socketio/ISocketIOModel';
import ISnackbarState from '@/model/state/snackbar/ISnackbarState';
import ITunerStatusState from '@/model/state/tuner/ITunerStatusState';
import IVersionState from '@/model/state/version/IVersionState';
import { ISettingStorageModel, ISettingValue } from '@/model/storage/setting/ISettingStorageModel';
import { Component, Vue, Watch } from 'vue-property-decorator';
import { Location } from 'vue-router';
import Util from '../../util/Util';

interface NavigationItem {
    title: string;
    icon: string;
    herf: Location | null;
}

@Component({})
export default class Navigation extends Vue {
    // チューナー状態 polling 間隔 (server 側で Mirakurun 照会は TTL cache により 1 本化される)
    private static readonly TUNER_POLLING_INTERVAL = 10 * 1000;

    public navigationState: INavigationState = container.get<INavigationState>('INavigationState');
    public tunerStatusState: ITunerStatusState = container.get<ITunerStatusState>('ITunerStatusState');

    private serverConfig: IServerConfigModel = container.get<IServerConfigModel>('IServerConfigModel');
    private setting: ISettingStorageModel = container.get<ISettingStorageModel>('ISettingStorageModel');
    private socketIoModel: ISocketIOModel = container.get<ISocketIOModel>('ISocketIOModel');
    private snackbarState: ISnackbarState = container.get<ISnackbarState>('ISnackbarState');
    private versionState: IVersionState = container.get<IVersionState>('IVersionState');
    private tunerPollingTimerId: number | null = null;
    private onUpdateStatusCallback = (async (): Promise<void> => {
        await this.versionState.fetchData();
    }).bind(this);
    // browser tab が非表示の間は polling を停止する (Page Visibility API)
    private onVisibilityChangeCallback = ((): void => {
        if (document.hidden === true) {
            this.stopTunerPolling();
        } else {
            this.startTunerPolling();
        }
    }).bind(this);

    public created(): void {
        this.navigationState.updateItems(this.$route);

        // socket.io イベント
        this.socketIoModel.onUpdateState(this.onUpdateStatusCallback);

        // チューナー状態 polling
        document.addEventListener('visibilitychange', this.onVisibilityChangeCallback);
        if (document.hidden === false) {
            this.startTunerPolling();
        }
    }

    public beforeDestroy(): void {
        // socket.io イベント
        this.socketIoModel.offUpdateState(this.onUpdateStatusCallback);

        // チューナー状態 polling
        document.removeEventListener('visibilitychange', this.onVisibilityChangeCallback);
        this.stopTunerPolling();
    }

    /**
     * チューナー状態 polling の開始
     */
    private startTunerPolling(): void {
        if (this.tunerPollingTimerId !== null) {
            return;
        }

        this.fetchTunerStatus();
        this.tunerPollingTimerId = window.setInterval(() => {
            this.fetchTunerStatus();
        }, Navigation.TUNER_POLLING_INTERVAL);
    }

    /**
     * チューナー状態 polling の停止
     */
    private stopTunerPolling(): void {
        if (this.tunerPollingTimerId !== null) {
            window.clearInterval(this.tunerPollingTimerId);
            this.tunerPollingTimerId = null;
        }
    }

    /**
     * チューナー状態の取得
     */
    private async fetchTunerStatus(): Promise<void> {
        await this.tunerStatusState.fetchData().catch(err => {
            console.error(err);
        });
    }

    public getNavigationItemClass(index: number): any {
        return this.navigationState.navigationPosition === index
            ? {
                  selected: true,
              }
            : {};
    }

    /**
     * ナビゲーション要素クリック時に呼ばれ、ページを移動する
     * @param item: NavigationItem
     */
    public async route(item: NavigationItem): Promise<void> {
        if (item.herf === null) {
            return;
        }

        // デスクトップ未満のサイズであったらナビゲーションを閉じる
        if (window.innerWidth < 1264) {
            this.navigationState.openState = false;
            await Util.sleep(200);
        }

        Util.move(this.$router, item.herf).catch(err => {
            console.error(err);
        });
    }

    @Watch('$route', { immediate: true, deep: true })
    public onUrlChange(): void {
        this.updateSelected();

        this.$nextTick(async () => {
            await this.versionState.fetchData().catch(err => {
                this.snackbarState.open({
                    color: 'error',
                    text: 'バージョン情報取得に失敗',
                });
                console.error(err);
            });
        });
    }

    /**
     * 選択位置を更新
     */
    private updateSelected(): void {
        this.$nextTick(() => {
            this.navigationState.updateNavigationPosition(this.$route);
        });
    }
}
</script>

<style lang="sass" scoped>
.list-dummy
    margin-bottom: 16px

.tuner-status
    border-top: 1px solid rgba(128, 128, 128, 0.3)

.v-item-group
    .selected
        &:before
            opacity: 0.12

// iOS デバイスで一番下までスクロールできないため
.v-navigation-drawer
    height: 100% !important
</style>
