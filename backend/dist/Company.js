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
exports.Company = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Document_1 = require("./Document");
const BankAccount_1 = require("./BankAccount");
const TaxReport_1 = require("./TaxReport");
const Invoice_1 = require("./Invoice");
const Bill_1 = require("./Bill");
const FinancialReport_1 = require("./FinancialReport");
const Dashboard_1 = require("./Dashboard");
const Kpi_1 = require("./Kpi");
const Payroll_1 = require("./Payroll");
let Company = class Company {
};
exports.Company = Company;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Company.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Company.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Company.prototype, "organizationNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "vatNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Company.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Company.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Company.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => User_1.User, user => user.company),
    __metadata("design:type", Array)
], Company.prototype, "employees", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Document_1.Document, document => document.company),
    __metadata("design:type", Array)
], Company.prototype, "documents", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => BankAccount_1.BankAccount, bankAccount => bankAccount.company),
    __metadata("design:type", Array)
], Company.prototype, "bankAccounts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TaxReport_1.TaxReport, taxReport => taxReport.company),
    __metadata("design:type", Array)
], Company.prototype, "taxReports", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Invoice_1.Invoice, invoice => invoice.company),
    __metadata("design:type", Array)
], Company.prototype, "invoices", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Bill_1.Bill, bill => bill.company),
    __metadata("design:type", Array)
], Company.prototype, "bills", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => FinancialReport_1.FinancialReport, financialReport => financialReport.company),
    __metadata("design:type", Array)
], Company.prototype, "financialReports", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Dashboard_1.Dashboard, dashboard => dashboard.company),
    __metadata("design:type", Array)
], Company.prototype, "dashboards", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Kpi_1.Kpi, kpi => kpi.company),
    __metadata("design:type", Array)
], Company.prototype, "kpis", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Payroll_1.Payroll, payroll => payroll.company),
    __metadata("design:type", Array)
], Company.prototype, "payrolls", void 0);
exports.Company = Company = __decorate([
    (0, typeorm_1.Entity)('companies')
], Company);
//# sourceMappingURL=Company.js.map