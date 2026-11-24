import { createFileRoute } from "@tanstack/react-router";
import Landing from "@/components/landing";
import { validateReturnSearch } from "@/hooks/return-to";

export const Route = createFileRoute("/")({
    validateSearch: validateReturnSearch,
    component: Landing,
});
