import { create } from "zustand";

export interface Recipient {
  address: string;
  label: string;
  bps: number;
}

export interface CreateDealForm {
  name: string;
  recipients: Recipient[];
  recoupIndex: number;
  recoupTarget: string;
  productName: string;
  productPrice: string;
  contentUrl: string; // URL to content delivered after payment
}

interface CreateDealStore {
  form: CreateDealForm;
  setName: (name: string) => void;
  addRecipient: () => void;
  removeRecipient: (index: number) => void;
  updateRecipient: (index: number, field: keyof Recipient, value: string | number) => void;
  setRecipients: (recipients: Recipient[]) => void;
  setRecoupIndex: (index: number) => void;
  setRecoupTarget: (target: string) => void;
  setProductName: (name: string) => void;
  setProductPrice: (price: string) => void;
  setContentUrl: (url: string) => void;
  resetForm: () => void;
  totalBps: () => number;
}

const defaultForm: CreateDealForm = {
  name: "",
  recipients: [
    { address: "", label: "Artist", bps: 7000 },
    { address: "", label: "Producer", bps: 3000 },
  ],
  recoupIndex: 0,
  recoupTarget: "",
  productName: "Digital Download",
  productPrice: "",
  contentUrl: "",
};

export const useCreateDealStore = create<CreateDealStore>((set, get) => ({
  form: { ...defaultForm },

  setName: (name) =>
    set((state) => ({
      form: { ...state.form, name },
    })),

  addRecipient: () =>
    set((state) => ({
      form: {
        ...state.form,
        recipients: [
          ...state.form.recipients,
          { address: "", label: `Collaborator ${state.form.recipients.length + 1}`, bps: 0 },
        ],
      },
    })),

  removeRecipient: (index) =>
    set((state) => ({
      form: {
        ...state.form,
        recipients: state.form.recipients.filter((_, i) => i !== index),
        recoupIndex:
          state.form.recoupIndex >= index && state.form.recoupIndex > 0
            ? state.form.recoupIndex - 1
            : state.form.recoupIndex,
      },
    })),

  updateRecipient: (index, field, value) =>
    set((state) => ({
      form: {
        ...state.form,
        recipients: state.form.recipients.map((r, i) =>
          i === index ? { ...r, [field]: value } : r
        ),
      },
    })),

  setRecipients: (recipients) =>
    set((state) => ({
      form: { ...state.form, recipients },
    })),

  setRecoupIndex: (recoupIndex) =>
    set((state) => ({
      form: { ...state.form, recoupIndex },
    })),

  setRecoupTarget: (recoupTarget) =>
    set((state) => ({
      form: { ...state.form, recoupTarget },
    })),

  setProductName: (productName) =>
    set((state) => ({
      form: { ...state.form, productName },
    })),

  setProductPrice: (productPrice) =>
    set((state) => ({
      form: { ...state.form, productPrice },
    })),

  setContentUrl: (contentUrl) =>
    set((state) => ({
      form: { ...state.form, contentUrl },
    })),

  resetForm: () =>
    set({
      form: { ...defaultForm },
    }),

  totalBps: () => get().form.recipients.reduce((sum, r) => sum + r.bps, 0),
}));

// Transaction status store
interface TxStore {
  pendingTx: string | null;
  txStatus: "idle" | "pending" | "success" | "error";
  txError: string | null;
  setPendingTx: (hash: string | null) => void;
  setTxStatus: (status: "idle" | "pending" | "success" | "error") => void;
  setTxError: (error: string | null) => void;
  resetTx: () => void;
}

export const useTxStore = create<TxStore>((set) => ({
  pendingTx: null,
  txStatus: "idle",
  txError: null,
  setPendingTx: (hash) => set({ pendingTx: hash }),
  setTxStatus: (status) => set({ txStatus: status }),
  setTxError: (error) => set({ txError: error }),
  resetTx: () => set({ pendingTx: null, txStatus: "idle", txError: null }),
}));
