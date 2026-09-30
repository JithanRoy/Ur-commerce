import { CheckoutSkeleton } from "@/components/ui/page-skeletons";

export default function Loading() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl font-semibold">Checkout</h1>
      <CheckoutSkeleton />
    </div>
  );
}
