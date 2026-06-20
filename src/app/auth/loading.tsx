import { FormPageSkeleton } from "@/components/loading/page-skeletons";

export default function AuthLoading() {
  return (
    <div className="mx-auto w-full max-w-md">
      <FormPageSkeleton fields={4} />
    </div>
  );
}
