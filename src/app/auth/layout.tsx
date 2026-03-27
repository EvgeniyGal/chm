export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">{children}</div>
    </div>
  );
}

