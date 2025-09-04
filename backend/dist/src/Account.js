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
exports.Account = void 0;
const typeorm_1 = require("typeorm");
const ChartOfAccounts_1 = require("./ChartOfAccounts");
const Transaction_1 = require("./Transaction");
const TaxRule_1 = require("./TaxRule");
const InvoiceItem_1 = require("./InvoiceItem");
const BillItem_1 = require("./BillItem");
let Account = class Account {
};
exports.Account = Account;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Account.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Account.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Account.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Account.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
        default: 'ASSET'
    }),
    __metadata("design:type", String)
], Account.prototype, "accountType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['ACTIVE', 'PASSIVE'],
        default: 'ACTIVE'
    }),
    __metadata("design:type", String)
], Account.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Account.prototype, "balance", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Account.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Account.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ChartOfAccounts_1.ChartOfAccounts, chartOfAccounts => chartOfAccounts.accounts),
    __metadata("design:type", ChartOfAccounts_1.ChartOfAccounts)
], Account.prototype, "chartOfAccounts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Transaction_1.Transaction, transaction => transaction.account),
    __metadata("design:type", Array)
], Account.prototype, "transactions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TaxRule_1.TaxRule, taxRule => taxRule.account),
    __metadata("design:type", Array)
], Account.prototype, "taxRules", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => InvoiceItem_1.InvoiceItem, invoiceItem => invoiceItem.account),
    __metadata("design:type", Array)
], Account.prototype, "invoiceItems", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => BillItem_1.BillItem, billItem => billItem.account),
    __metadata("design:type", Array)
], Account.prototype, "billItems", void 0);
exports.Account = Account = __decorate([
    (0, typeorm_1.Entity)('accounts')
], Account);
//# sourceMappingURL=Account.js.map