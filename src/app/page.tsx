import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { SignInButton, SignOutButton } from "@/components/auth-buttons"

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <div className="flex items-center justify-center h-screen">
      {session ? (
        <div className="border rounded-lg p-8 max-w-md w-full space-y-4">
          <h1 className="text-2xl font-bold text-center">Profile</h1>
          <div className="space-y-2">
            <div>
              <p className="text-sm">Name</p>
              <p className="font-medium">{session.user.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm">Email</p>
              <p className="font-medium">{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm">User ID</p>
              <p className="font-mono text-xs">{session.user.id}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      ) : (
        <div className="border rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-6">Welcome</h1>
          <div className="flex flex-col gap-2">
            <SignInButton provider="discord"/>
            <SignInButton provider="google"/>
          </div>
        </div>
      )}
    </div>
  )
}