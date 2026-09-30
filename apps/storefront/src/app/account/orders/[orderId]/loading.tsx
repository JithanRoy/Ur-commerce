import { CartSkeleton } from "@/components/ui/page-skeletons";

export default function Loading() {
  return (
    <div className="container-page py-10">
      <CartSkeleton label="Loading your order" />
    </div>
  );
}
