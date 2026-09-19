\# B2B RFQ Marketplace



A full-stack B2B Request for Quotation (RFQ) marketplace that connects buyers with suppliers.



Buyers can create and manage RFQs, while suppliers can browse RFQs and submit quotations.



\## Features



\### Buyer



\- Secure signup and login

\- Create RFQs

\- Edit RFQs

\- Delete RFQs

\- View submitted RFQs

\- View supplier quotations

\- Validate RFQ deadlines

\- Manage RFQ details including:

&#x20; - Product/service name

&#x20; - Description

&#x20; - Quantity

&#x20; - Delivery location

&#x20; - Deadline



\### Supplier



\- Secure signup and login

\- Browse available RFQs

\- Search RFQs by product name or description

\- Filter RFQs by delivery location

\- Filter RFQs by deadline

\- View RFQ details

\- Submit quotations

\- View previous quotation submissions

\- Prevent duplicate quotations for the same RFQ



\### Authentication and Security



\- JWT-based authentication

\- Password hashing using bcrypt

\- Role-based access control

\- Buyer and Supplier roles

\- Protected API routes

\- Request validation using Zod

\- Authentication and authorization error handling

\- Duplicate quotation protection



\### UI/UX



\- Responsive React interface

\- Loading states

\- Error messages

\- Empty states

\- Form validation

\- Mobile-friendly supplier filters



\## Tech Stack



\### Frontend



\- React

\- TypeScript

\- Vite



\### Backend



\- Node.js

\- Express

\- TypeScript



\### Database



\- PostgreSQL

\- Prisma ORM



\### Authentication and Validation



\- JSON Web Tokens (JWT)

\- bcryptjs

\- Zod



\## Project Structure



```text

b2b-rfq-marketplace/

├── frontend/

│   ├── src/

│   └── package.json

│

├── backend/

│   ├── src/

│   │   ├── lib/

│   │   ├── middleware/

│   │   ├── routes/

│   │   └── server.ts

│   ├── prisma/

│   │   └── schema.prisma

│   └── package.json

│

└── README.md

