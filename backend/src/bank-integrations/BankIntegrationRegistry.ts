import { BankConnector } from './BankConnector';
import { NordeaConnector } from './NordeaConnector';
import { SebConnector } from './SebConnector';
import { SwishConnector } from './SwishConnector';

export class BankIntegrationRegistry {
  private connectors: Map<string, BankConnector> = new Map();

  constructor() {
    const defaultConnectors: BankConnector[] = [
      new NordeaConnector(),
      new SebConnector(),
      new SwishConnector()
    ];
    defaultConnectors.forEach(connector => this.connectors.set(connector.bankCode, connector));
  }

  registerConnector(connector: BankConnector): void {
    this.connectors.set(connector.bankCode, connector);
  }

  getConnector(bankCode: string): BankConnector | undefined {
    return this.connectors.get(bankCode);
  }

  listConnectors(): string[] {
    return Array.from(this.connectors.keys());
  }
}
