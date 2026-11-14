import { DeliveryList } from '../../features/fulfillment'
export function DeliveriesPage() { return <DeliveryList /> }
export function MyDeliveriesPage() { return <DeliveryList mine /> }

export function IssueNotesPage() { return <DeliveryList issueNotes /> }
