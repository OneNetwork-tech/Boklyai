"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxRule = void 0;
const typeorm_1 = require("typeorm");
const Account_1 = require("./Account");
const TaxRate_1 = require("./TaxRate");
// Import the correct TaxReport entity
const TaxReport_1 = require("./TaxReport");
let TaxRule = class TaxRule {
};
exports.TaxRule = TaxRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TaxRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], TaxRule.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], TaxRule.prototype, "taxRateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], TaxRule.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], TaxRule.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], TaxRule.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], TaxRule.prototype, "validTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], TaxRule.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxRule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TaxRule.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Account_1.Account, account => account.taxRules),
    (0, typeorm_1.JoinColumn)({ name: 'account_id' }),
    __metadata("design:type", Account_1.Account)
], TaxRule.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TaxRate_1.TaxRate, taxRate => taxRate.taxRules),
    (0, typeorm_1.JoinColumn)({ name: 'tax_rate_id' }),
    __metadata("design:type", TaxRate_1.TaxRate)
], TaxRule.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TaxReport_1.TaxReport, taxReport => taxReport.taxRule),
    __metadata("design:type", Array)
], TaxRule.prototype, "taxReports", void 0);
exports.TaxRule = TaxRule = __decorate([
    (0, typeorm_1.Entity)('tax_rules')
], TaxRule);
//# sourceMappingURL=TaxRule.js.map