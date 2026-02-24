# Budget Module User Guide

## Quick Start

### Creating a New Budget

1. **Navigate to Budgets**
   - Click "Budgets" in the left sidebar menu
   - Click "New Budget" button in the top right

2. **Select Patient & Total Amount**
   - Choose patient from dropdown
   - Enter total amount for the treatment
   - Set budget status (pending, active, or paid)

3. **Choose Financing Type**
   - **Fixed Quotes**: Patient has structured payment schedule
   - **Open Balance**: Flexible payment without predefined schedule

4. **For Fixed Quotes Only:**
   - Enter number of quotes (e.g., 3 for 3 payments)
   - System auto-generates payment schedule:
     - Quotes divided equally
     - Due dates 1 month apart
     - Last quote adjusted for rounding

5. **Add Treatment Procedures**
   - Click "Add Procedure" button
   - Select procedure from dropdown (costs auto-populate)
   - Enter quantity
   - Unit price shows automatically
   - Subtotal calculates automatically
   - Repeat for each procedure

6. **Review Payment Schedule**
   - For fixed quotes, see generated payment schedule
   - **Edit Individual Quotes:**
     - Change amount in Amount column
     - Change due date in Due Date column
   - **Validation Warning:**
     - If quote sum ≠ total amount, warning appears
     - Fix by adjusting individual quote amounts

7. **Save Budget**
   - Enter optional description
   - Click "Create Budget"
   - Redirected to budget list

### Viewing Budgets

1. **Browse All Budgets**
   - Budgets page shows table of all budgets
   - See patient name, date, total, financing type, status at a glance

2. **Search & Filter**
   - **Search Box**: Find by patient name
   - **Status Filter**: Show only pending/active/paid budgets

3. **Actions**
   - **View**: See full budget details (coming soon)
   - **Edit**: Modify existing budget
   - **Delete**: Remove budget (with confirmation)

## Quote System Explained

### How Quotes Calculate

**Example: $1,500 total over 3 quotes**

1. Base amount per quote: $1,500 ÷ 3 = $500
2. Quote 1: Due next month = $500.00
3. Quote 2: Due 2 months = $500.00
4. Quote 3: Due 3 months = $500.00

**Example with rounding: $1,000 total over 3 quotes**

1. Base amount: $1,000 ÷ 3 = $333.33...
2. Quote 1: Due next month = $333.33
3. Quote 2: Due 2 months = $333.33
4. Quote 3: Due 3 months = $333.34 (adjusted for rounding)

- **Total: $333.33 + $333.33 + $333.34 = $1,000.00** ✓

### Manual Quote Adjustment

You can edit individual quotes after they're generated:

1. **Change Amount**: Click amount field, enter new value
2. **Change Due Date**: Click date field, select new date
3. **Validation**:
   - If sum ≠ total, yellow warning appears
   - Fix by adjusting other quotes
   - Warning clears when valid

**Example Adjustment:**

- Original Schedule: 3 × $333
- Manually change Quote 1 to $250
- System warns: "Sum ($999.66) ≠ Total ($1,000)"
- Increase Quote 3 to $483.34
- Warning clears: "Sum ($1,000.00) = Total ($1,000.00)" ✓

## Status Meanings

| Status      | Color  | Meaning                             |
| ----------- | ------ | ----------------------------------- |
| **Pending** | Yellow | Budget created, not yet activated   |
| **Active**  | Blue   | Patient is actively on payment plan |
| **Paid**    | Green  | Budget fully paid by patient        |

## Financing Type Comparison

| Aspect               | Fixed Quotes            | Open Balance       |
| -------------------- | ----------------------- | ------------------ |
| **Payment Plan**     | Structured schedule     | Flexible           |
| **Quote Schedule**   | Auto-generated          | N/A                |
| **Due Dates**        | Predefined              | N/A                |
| **Payment Tracking** | Against quotes          | Free-form          |
| **Best For**         | Installments, financing | Cash/flex payments |

## Common Tasks

### Edit a Budget

1. Click "Edit" action on budget row
2. Form loads with existing budget data
3. Modify procedures, quotes, or details
4. Click "Update Budget"

### Delete a Budget

1. Click "Delete" action on budget row
2. Confirmation dialog appears
3. Click "Delete" to confirm
4. Budget removed from database

### Modify Quotes After Creation

1. View budget
2. In "Payment Schedule" table:
   - Edit "Amount" column to change payment amount
   - Edit "Due Date" column to change payment date
3. System validates total when you're done
4. Success when sum matches total (within $0.01)

### Search for a Budget

1. On Budgets page, use "Search Patient" box
2. Type patient name (first or last)
3. Results filter in real-time

### Filter by Status

1. On Budgets page, use "Status" dropdown
2. Select: All, Pending, Active, or Paid
3. Table updates immediately

## Important Notes

- **Budget amounts**: Entered in dollars/local currency
- **Decimal precision**: Amounts calculated to 2 decimal places
- **Quote rounding**: Last quote always adjusted to ensure total matches exactly
- **Patient selection**: Only patients in system can be selected
- **Procedure prices**: Come from Procedures system
- **Real-time sync**: All budgets sync across browser tabs/devices automatically

## Troubleshooting

**Q: Quote validation warning persists**

- A: Check that sum of all quotes exactly equals total amount
- Solution: Adjust last quote to exact difference

**Q: Can't find patient**

- A: Patient must exist in Patient system first
- Solution: Create patient before creating budget

**Q: Can't add procedure**

- A: Procedure must exist in Procedures system
- Solution: Add procedure to system first

**Q: Save failed**

- A: Check required fields (patient, amount, financing type)
- Solution: Fill all required fields and try again

**Q: Quotes didn't generate**

- A: Only appears for "Fixed Quotes" financing type
- Solution: Select "Fixed Quotes" and enter numberOfQuotes
