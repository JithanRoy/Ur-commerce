import { ListSkeleton } from "@/components/ui/page-skeletons";

export default function Loading() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl font-semibold">Your addresses</h1>
      <ListSkeleton rows={2} label="Loading your addresses" />
    </div>
  );
}
