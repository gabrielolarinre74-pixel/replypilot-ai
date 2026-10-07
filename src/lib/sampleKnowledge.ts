import type { KnowledgeDoc } from './rag'

// Fictional sample business used by the live demo. Replace it with your own documents
// from the Knowledge base tab (or upload .md / .txt files).
export const SAMPLE_BUSINESS = 'Harbor & Pine Home Goods'

export const SAMPLE_DOCS: KnowledgeDoc[] = [
  {
    id: 'shipping',
    title: 'Shipping & delivery policy',
    content: `We ship every order within 1 to 2 business days of payment. Standard delivery takes 3 to 5 business days and express delivery takes 1 to 2 business days.

Standard shipping is free on orders over $75. Below that, standard shipping costs $6.90 and express shipping costs $14.90.

As soon as your parcel leaves our warehouse you receive an email with a tracking link. If tracking has not updated for 3 business days, reply to that email and we will open an investigation with the courier.

We currently ship to the United States, Canada and the United Kingdom. International orders may be charged import duties by the destination country, which are paid by the customer.`,
  },
  {
    id: 'returns',
    title: 'Returns & refunds',
    content: `You can return any unused item in its original packaging within 30 days of delivery for a full refund. Sale items can be returned for store credit only.

To start a return, email support with your order number and the items you want to send back. We reply with a prepaid return label within one business day. Return shipping is free for orders in the United States.

Refunds are issued to the original payment method within 5 business days after the return reaches our warehouse. Your bank may need a few extra days to show the money in your account.

If an item arrives damaged or faulty, send us a photo within 7 days of delivery and we will send a free replacement or a full refund, whichever you prefer. You do not need to send damaged items back.`,
  },
  {
    id: 'contact',
    title: 'Opening hours & contact',
    content: `Our support team is available Monday to Friday from 9am to 6pm Eastern Time, and Saturday from 10am to 2pm. We are closed on Sundays and public holidays.

The fastest way to reach us is live chat on the website or email at support@harborandpine.example. We answer emails within one business day.

Our showroom at 12 Harbor Street is open Tuesday to Saturday from 10am to 5pm. Click and collect orders can be picked up during showroom hours with your order confirmation.`,
  },
  {
    id: 'payments',
    title: 'Payments, invoices & pricing',
    content: `We accept Visa, Mastercard, American Express, PayPal and Apple Pay. Your card is charged when the order is placed.

An invoice is attached to your order confirmation email. Business customers can request an invoice with their company name and tax number by replying to that email.

If you see a double charge, it is usually a temporary authorisation hold that disappears within 3 business days. If it is still there after 3 days, send us a screenshot and we will fix it the same day.

Prices on the website include sales tax where it applies. We run a seasonal sale twice a year and newsletter subscribers get 10% off their first order.`,
  },
  {
    id: 'wholesale',
    title: 'Wholesale & corporate orders',
    content: `We work with interior designers, hotels, restaurants and offices. Wholesale pricing starts at orders of 20 units of the same product.

Corporate gifting orders can include custom notes and branded packaging. Please allow 10 business days for custom packaging.

To get a wholesale quote, send the products, quantities and delivery address to sales@harborandpine.example and a team member will reply within two business days.`,
  },
  {
    id: 'care',
    title: 'Product care & warranty',
    content: `Our solid wood furniture comes with a 2-year warranty against manufacturing defects. Ceramics and textiles have a 1-year warranty.

Clean wood with a soft dry cloth and avoid direct sunlight and radiators. Linen and cotton textiles can be machine washed at 30 degrees and should be line dried.

The warranty does not cover normal wear, accidental damage or damage caused by not following the care instructions. To make a warranty claim, email support with your order number and photos of the problem.`,
  },
]
