import { CreditProfileRequestForm } from './CreditProfileRequestForm.tsx'
export interface CreditProfileSubject {
  customerId: string
  customerType?: string
  creditLimit?: number
  creditTermDays?: number
}

/** @deprecated Compatibility wrapper for the legacy detail dialog. */
export function CreditProfilePanel({ customer, onDone }: { customer: CreditProfileSubject; onDone: () => void }) {
  return <CreditProfileRequestForm customer={customer} onCancel={onDone} onDone={onDone} />
}
