
### **Full Instructions: The Integrations Module**

**Objective:** Build a complete module that allows users to securely add, view, edit, and manage their e-commerce store connections (e.g., Shopify, WooCommerce). This module is the foundation for ingesting all order data into Astra.

***
## **1. Database Model Reference**

You will be working exclusively with the **`integrations`** table. Remember its key characteristics:
* It has a **`user_id`** field, creating a direct link to the `users` table to establish ownership.
* It contains all necessary connection details: `name`, `type`, `domain`, and the security fields `webhook_secret` and `admin_access_token`.
* The `domain` field must be unique to prevent connecting the same store twice.

***
## **2. User Interface (UI) & Experience (UX)**

The UI for this module will be located at the `/settings/integrations` route. It should be clean, modern, and follow the Astra Design System.

**Key UI Components to Build:**

1.  **"Add Integration" Button:**
    * Place a prominent primary button at the top of the page with the text "Add New Integration".
    * Clicking this button must open a **Modal/Dialog** for the creation form.

2.  **Integration Form (inside the Modal):**
    * **Title:** "Connect a New Store".
    * **Fields:**
        * `Store Name`: A required text input.
        * `Platform`: A required `Select` dropdown with `Shopify` and `WooCommerce` as options.
        * `Store Domain`: A required text input (e.g., `my-shop.myshopify.com`). Implement basic validation to ensure it looks like a domain.
    * **Actions:** Include "Cancel" and "Save Connection" buttons. The "Save" button should be disabled until all required fields are filled.

3.  **Integrations List:**
    * If the user has existing integrations, display them in a grid of `Card` components.
    * **Each Card Must Display:**
        * The **Store Name** (`integrations.name`).
        * The **Store Domain** (`integrations.domain`).
        * The **Platform Type** (`integrations.type`), preferably with the Shopify or WooCommerce logo for quick identification.
        * An `is_active` **Badge** (e.g., a green "Active" badge).
    * **Card Actions:** Each card must have "Edit" and "Delete" buttons. The "Delete" button must trigger a confirmation modal before proceeding.

4.  **Webhook Credentials Display:**
    * This is a critical UX step. After a user successfully creates a **new** integration, the modal should transform to a success state.
    * **Display the following information clearly:**
        * **Title:** "Connection Successful!"
        * **Webhook URL:** The fully constructed URL (`https://.../api/webhooks/order?id=...`). Provide a "Copy" button next to it.
        * **Webhook Secret:** The generated secret key. Provide a "Copy" button next to it.
    * Include a "Done" button to close the modal.



***
## **3. Backend API Routes (Next.js)**

You will create a set of API routes to handle all CRUD (Create, Read, Update, Delete) operations for integrations. All logic must be secure and efficient.

* **`GET /api/integrations`**
    * **Purpose:** To list integrations.
    * **Logic:** Implement the Admin vs. Seller security rule. If the user is an 'admin', fetch all records. If they are a 'seller', add a `where: { userId: session.user.id }` clause to your Prisma query.

* **`POST /api/integrations`**
    * **Purpose:** To create a new integration.
    * **Logic:**
        1.  Validate the incoming `name`, `type`, and `domain` using Zod.
        2.  **Generate a secure, random string** for the `webhook_secret`.
        3.  Create the new record in the `integrations` table using Prisma. You **must** set the `userId` to the ID of the currently authenticated user from the session.
        4.  Construct the full `webhookUrl`.
        5.  Return the newly created integration record, along with the `webhookUrl` and `webhook_secret`, to the frontend.

* **`PUT /api/integrations/[id]`**
    * **Purpose:** To update an existing integration.
    * **Logic:**
        1.  Validate the incoming data.
        2.  Perform the security check: Fetch the integration first and verify that the `userId` on the record matches the session user's ID (unless the user is an admin). If it doesn't match, return a `403 Forbidden` error.
        3.  If the check passes, update the record in the database.

* **`DELETE /api/integrations/[id]`**
    * **Purpose:** To delete an integration.
    * **Logic:** The security check is the same as for updating. First, verify ownership, then proceed with the deletion. If the check fails, return a `403 Forbidden` error.

***
## **4. Security & Access Control Implementation**

This is non-negotiable. You must implement security at both the database and application layers.

1.  **Database Layer (Supabase RLS):**
    * Ensure the RLS policies described in our previous discussion are active on the `integrations` table. This is your ultimate safety net.

2.  **Application Layer (API Routes):**
    * Every single API route related to integrations **must** first get the user's session to check their ID and role.
    * All database queries performed with Prisma **must** be scoped to the user's permissions.
    * Return clear `401 Unauthorized` (if not logged in), `403 Forbidden` (if not authorized), and `404 Not Found` (if the record doesn't exist) errors.