export const initialState = {
    cartItems: [],
    isCartOpen: false,
    couponCode: null,
    activeCoupon: null,
    userDetails: {
        name: "",
        phone: "",
        campus: "",
        address: "",
        instructions: "",
    },
};

export function cartReducer(state, action) {
    switch (action.type) {
        case "LOAD_USER_DETAILS":
            return {
                ...state,
                userDetails: { ...state.userDetails, ...action.payload },
            };

        case "UPDATE_USER_DETAILS":
            return {
                ...state,
                userDetails: action.payload,
            };

        case "SET_CART_OPEN":
            return {
                ...state,
                isCartOpen: action.payload,
            };

        case "ADD_ITEM": {
            const { item, quantityDelta = 1 } = action.payload;
            const key = item.cartKey || item.id;
            const existing = state.cartItems.find((i) => (i.cartKey || i.id) === key);
            let newItems;

            if (existing) {
                newItems = state.cartItems
                    .map((i) =>
                        (i.cartKey || i.id) === key
                            ? { ...i, quantity: Math.max(0, i.quantity + quantityDelta) }
                            : i
                    )
                    .filter((i) => i.quantity > 0);
            } else if (quantityDelta > 0) {
                newItems = [...state.cartItems, { ...item, cartKey: key, quantity: quantityDelta }];
            } else {
                newItems = state.cartItems;
            }

            return { ...state, cartItems: newItems };
        }

        case "REMOVE_ITEM": {
            const key = action.payload;
            return {
                ...state,
                cartItems: state.cartItems.filter((i) => (i.cartKey || i.id) !== key),
            };
        }

        case "UPDATE_QUANTITY": {
            const key = action.payload.id;
            return {
                ...state,
                cartItems: state.cartItems
                    .map((i) => {
                        if ((i.cartKey || i.id) === key) {
                            const newQty = Math.max(0, i.quantity + action.payload.delta);
                            return { ...i, quantity: newQty };
                        }
                        return i;
                    })
                    .filter((i) => i.quantity > 0),
            };
        }

        case "CLEAR_CART":
            return {
                ...state,
                cartItems: [],
                couponCode: null,
                activeCoupon: null,
            };

        case "APPLY_COUPON":
            return {
                ...state,
                couponCode: action.payload.code,
                activeCoupon: action.payload.coupon,
            };

        case "REMOVE_COUPON":
            return {
                ...state,
                couponCode: null,
                activeCoupon: null,
            };

        case "RESTORE_CART": // Optional: if we want to restore cart from localstorage too
            return { ...state, cartItems: action.payload };

        default:
            return state;
    }
}
