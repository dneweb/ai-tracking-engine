import { useSignIn } from "@clerk/nextjs";
type SignInResource = NonNullable<ReturnType<typeof useSignIn>["signIn"]>;
type CreateResult = ReturnType<SignInResource["create"]>;
