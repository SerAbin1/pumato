# Implementation Plan: Delivery Partner Enhancements

This document outlines the implementation plan for three key features:
1. Rename "delivery-boy" to "delivery-partner" throughout the application
2. Add "Delivered" button for delivery partners to mark items as delivered
3. Add 35-minute countdown timer for ready orders with visual indicators

---

## Overview

### Current Architecture
- **Delivery Boy Page**: `app/delivery-boy/page.js` - Main dashboard for delivery personnel
- **Delivery Boy Layout**: `app/delivery-boy/layout.js` - Metadata wrapper
- **Authentication**: Firebase Auth with custom claims (`deliveryBoy: true`)
- **Firestore Rules**: `firestore.rules` - Access control for delivery personnel
- **User Management**: `app/admin/components/UsersTab.js` - Admin panel for creating delivery accounts
- **Backend Functions**: `supabase/functions/manage-users/index.ts` - User creation with claims
- **Admin Script**: `createDeliveryBoy.js` - CLI tool for creating delivery accounts

---

## Task 1: Rename "delivery-boy" to "delivery-partner"

### Files to Modify

#### 1.1 Directory Structure
- **Rename**: `app/delivery-boy/` → `app/delivery-partner/`
  - This includes `page.js` and `layout.js`

#### 1.2 Firestore Rules (`firestore.rules`)
| Line | Current | New |
|------|---------|-----|
| Function name | `isDeliveryBoy()` | `isDeliveryPartner()` |
| Comments | "Delivery boys: read ready_for_delivery..." | "Delivery partners: read ready_for_delivery..." |

#### 1.3 Custom Claims (Multiple Files)
| File | Current | New |
|------|---------|-----|
| `createDeliveryBoy.js` → rename to `createDeliveryPartner.js` | `deliveryBoy: true` | `deliveryPartner: true` |
| `supabase/functions/manage-users/index.ts` | `deliveryBoy: true` | `deliveryPartner: true` |
| All occurrences | `deliveryBoy` claim | `deliveryPartner` claim |

#### 1.4 Admin Users Tab (`app/admin/components/UsersTab.js`)
- Update tab label: "Delivery Boys" → "Delivery Partners"
- Update button text: "Create Delivery Boy" → "Create Delivery Partner"
- Update card labels and messages

#### 1.5 Delivery Partner Page (`app/delivery-partner/page.js`)
- Update all references:
  - `isDeliveryBoy` → `isDeliveryPartner`
  - Variable names and state
  - Toast messages

#### 1.6 Delivery Partner Layout (`app/delivery-partner/layout.js`)
- Update metadata title and description if needed

### Implementation Order
1. Create new directory `app/delivery-partner/`
2. Copy and modify `page.js` and `layout.js`
3. Update `firestore.rules`
4. Update `supabase/functions/manage-users/index.ts`
5. Rename and update `createDeliveryBoy.js` → `createDeliveryPartner.js`
6. Update `app/admin/components/UsersTab.js`
7. Delete old `app/delivery-boy/` directory
8. Update any import references or navigation links

---

## Task 2: Add "Delivered" Button for Picked-Up Orders

### Current State
The delivered button already exists in `app/delivery-boy/page.js`:
- There is already a `handleDeliver` function
- There is already a "Mark as Delivered" button that appears for orders with `status === "picked_up"`
- The button calls `handleDeliver` which updates status to "delivered"

### Verification Needed
The current implementation appears complete. The functionality includes:
- `handleDeliver` function that uses transaction to safely update order status
- Button shows only for orders with `picked_up` status
- Updates Firestore with `status: "delivered"` and `deliveredAt: serverTimestamp()`
- Sends notification to admin via Supabase function

### Additional Recommendations
1. **Firestore Rules Update**: Ensure rules allow delivery partners to update `picked_up` orders to `delivered`:
   ```
   allow update: if isDeliveryPartner()
       && resource.data.status == "picked_up"
       && request.resource.data.status == "delivered"
       && resource.data.deliveryBoyUid == request.auth.uid;
   ```

2. **Admin Notification**: Verify the `send-fcm-notification` function handles the delivered event correctly.

---

## Task 3: 35-Minute Countdown Timer for Ready Orders

### Requirements
- Start countdown when order status changes to `ready_for_delivery`
- Timer starts from 35 minutes (2,100,000 ms)
- Go to negative values if exceeded (showing delay)
- Turn red when timer goes negative (overdue)
- Only apply to orders visible to delivery partners (those with `ready_for_delivery` status)

### Implementation Details

#### 3.1 Data Model Update
The `readyAt` timestamp is already being set when partner marks order as ready:
```javascript
// In partner/page.js
if (action === "ready_for_delivery") {
    updates.readyAt = serverTimestamp();
}
```

#### 3.2 New Component: CountdownTimer

Create a new component `app/delivery-partner/components/CountdownTimer.js`:

```javascript
"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function CountdownTimer({ readyAt, className = "" }) {
    const [timeDisplay, setTimeDisplay] = useState("");
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        if (!readyAt) return;

        const calculateTime = () => {
            const readyTime = readyAt.toDate ? readyAt.toDate() : new Date(readyAt);
            const deadline = new Date(readyTime.getTime() + 35 * 60 * 1000); // 35 minutes
            const now = new Date();
            const diff = deadline - now; // Can be negative

            const totalSeconds = Math.floor(diff / 1000);
            const isNegative = totalSeconds < 0;
            const absSeconds = Math.abs(totalSeconds);

            const minutes = Math.floor(absSeconds / 60);
            const seconds = absSeconds % 60;

            setTimeDisplay(
                isNegative
                    ? `-${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
                    : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
            );
            setIsOverdue(isNegative);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [readyAt]);

    if (!readyAt) return null;

    return (
        <div className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-gray-500"} ${className}`}>
            <Clock size={11} className={isOverdue ? "animate-pulse" : ""} />
            <span className={`text-xs font-mono ${isOverdue ? "font-bold" : ""}`}>
                {timeDisplay}
            </span>
            {isOverdue && (
                <span className="text-[10px] text-red-400 font-bold ml-1">OVERDUE</span>
            )}
        </div>
    );
}
```

#### 3.3 Integration into Order Cards

In `app/delivery-partner/page.js`, update the order card for "Ready for Pickup" orders:

```javascript
// Import the component
import CountdownTimer from "./components/CountdownTimer";

// In the order card header, replace the current time display:
<div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-purple-500/5">
    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
        Ready for Pickup
    </span>
    <div className="flex items-center gap-3">
        {/* NEW: Countdown timer */}
        <CountdownTimer readyAt={order.readyAt} />
        {/* Existing: Order time */}
        <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={11} />
            {order.createdAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
    </div>
</div>
```

#### 3.4 Firestore Query Update

The current query already fetches `readyAt` as part of the document. Ensure it's included in the mapping:

```javascript
const unsub = onSnapshot(q, snap => {
    setReadyOrders(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        createdAt: d.data().createdAt?.toDate(),
        readyAt: d.data().readyAt // Already included via spread, but explicit for clarity
    })));
});
```

#### 3.5 Firestore Rules - No Changes Needed
The `readyAt` field is already readable:
```
allow read: if isDeliveryPartner()
    && resource.data.status == "ready_for_delivery";
```

### Visual Design Specifications

| State | Timer Display | Color | Additional Indicator |
|-------|--------------|-------|---------------------|
| On time (> 5 min) | `MM:SS` | Gray (`text-gray-500`) | None |
| Warning (< 5 min) | `MM:SS` | Orange (`text-orange-400`) | None |
| Overdue (negative) | `-MM:SS` | Red (`text-red-400`) | "OVERDUE" label + pulsing icon |

### Enhanced Timer with Warning States (Optional)

```javascript
// Enhanced version with warning state
export default function CountdownTimer({ readyAt, className = "" }) {
    // ... existing state ...

    const getState = () => {
        if (isOverdue) return "overdue";
        if (timeRemaining < 5 * 60) return "warning"; // Less than 5 minutes
        return "normal";
    };

    const state = getState();

    return (
        <div className={`flex items-center gap-1 
            ${state === "overdue" ? "text-red-400" : ""} 
            ${state === "warning" ? "text-orange-400" : ""} 
            ${state === "normal" ? "text-gray-500" : ""} 
            ${className}`}
        >
            {/* ... rest of component ... */}
        </div>
    );
}
```

---

## Summary of Changes

### Files to Rename
| Old Path | New Path |
|----------|----------|
| `app/delivery-boy/` | `app/delivery-partner/` |
| `createDeliveryBoy.js` | `createDeliveryPartner.js` |

### Files to Modify
1. `app/delivery-partner/page.js` - Rename variables, add countdown timer
2. `app/delivery-partner/layout.js` - Update metadata
3. `app/delivery-partner/components/CountdownTimer.js` - **NEW FILE**
4. `firestore.rules` - Update function names and comments
5. `supabase/functions/manage-users/index.ts` - Update claim name
6. `app/admin/components/UsersTab.js` - Update labels
7. `createDeliveryPartner.js` - Update claim name

### Files to Verify (No Changes Expected)
1. Firestore security rules - Verify existing rules work with renamed claims
2. Partner page (`app/partner/page.js`) - Verify `readyAt` is being set

---

## Testing Checklist

### Task 1: Rename Verification
- [ ] Can navigate to `/delivery-partner`
- [ ] Old `/delivery-boy` route returns 404
- [ ] Can log in with existing delivery account
- [ ] New accounts created via admin panel work
- [ ] CLI script `createDeliveryPartner.js` works

### Task 2: Delivered Button Verification
- [ ] Button appears only for `picked_up` orders
- [ ] Button only shows for orders assigned to current delivery partner
- [ ] Clicking button updates status to `delivered`
- [ ] Admin receives notification
- [ ] Order moves to "My Deliveries" section with "Delivered" status

### Task 3: Countdown Timer Verification
- [ ] Timer appears on all `ready_for_delivery` orders
- [ ] Timer counts down every second
- [ ] Timer shows correct format (MM:SS)
- [ ] Timer goes negative after 35 minutes
- [ ] Red color appears when overdue
- [ ] "OVERDUE" label appears when timer is negative
- [ ] Multiple orders show independent timers correctly

---

## Migration Notes

### Existing User Claims
Users created before this change will have `deliveryBoy: true` claim. Consider:
1. **Option A**: Keep backward compatibility - check for both claims
2. **Option B**: Run migration script to update existing claims
3. **Option C**: Force all existing delivery accounts to be recreated

### Recommended Approach: Option A (Backward Compatibility)

Update the claim check to accept both:

```javascript
// In delivery-partner page
if (result.claims.deliveryPartner || result.claims.deliveryBoy) {
    setUser(firebaseUser);
    setIsDeliveryPartner(true);
}

// In firestore.rules
function isDeliveryPartner() {
    return request.auth != null && 
        (request.auth.token.deliveryPartner == true || 
         request.auth.token.deliveryBoy == true);
}
```

---

## Implementation Priority

1. **High Priority**: Task 3 (Countdown Timer) - Most visible feature, improves delivery efficiency
2. **Medium Priority**: Task 1 (Rename) - Breaking change, requires migration planning
3. **Low Priority**: Task 2 (Delivered Button) - Already implemented, verify functionality

---

## Estimated Effort

| Task | Estimated Time | Complexity |
|------|----------------|------------|
| Task 1: Rename | 2-3 hours | Medium (breaking changes) |
| Task 2: Delivered Button | 30 min | Low (verification only) |
| Task 3: Countdown Timer | 2-3 hours | Medium |
| Testing | 1-2 hours | - |
| **Total** | **5-8 hours** | - |