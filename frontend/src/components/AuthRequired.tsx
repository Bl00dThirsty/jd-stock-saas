import { Lock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLoginPrompt } from "@/store/loginPromptStore";

/**
 * Inline gate shown in place of a user-scoped page (portfolio, alerts) when the
 * visitor is signed out. Keeps the app shell/nav around it — they can still
 * browse the market — and offers a one-click path into the sign-in modal.
 */
export function AuthRequired({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const requestLogin = useLoginPrompt((s) => s.requestLogin);

  return (
    <div className="animate-rise">
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="bg-accent text-primary grid size-12 place-items-center rounded-full">
            <Lock className="size-6" />
          </div>
          <p className="font-display text-foreground text-lg">{title}</p>
          <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
          <Button className="mt-2" onClick={() => requestLogin(description)}>
            Sign in
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
