import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecordedEndStatus1783987200000 implements MigrationInterface {
    name = 'AddRecordedEndStatus1783987200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `recorded` ADD `endStatus` smallint NOT NULL DEFAULT 0');
        // failReason は将来の失敗理由記録 (tuner不足判定等) 用の休眠 column (migration 再発行の回避)
        await queryRunner.query('ALTER TABLE `recorded` ADD `failReason` smallint NOT NULL DEFAULT 0');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `recorded` DROP COLUMN `failReason`');
        await queryRunner.query('ALTER TABLE `recorded` DROP COLUMN `endStatus`');
    }
}
