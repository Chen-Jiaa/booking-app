import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Confirmation() {

    return (
        <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold mb-4">Check Your Email for the link</h3>
            <Button asChild>
            <Link href="/">Return to Home</Link>
            </Button>
        </div>
    )
}