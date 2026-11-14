import { useParams } from 'react-router-dom'
import { DeliveryDetails } from '../../features/fulfillment'
export function DeliveryDetailPage() { const { id } = useParams(); return <DeliveryDetails key={id} id={id ?? ''} /> }
