import Link from "next/link";
import { Shell, Card, Logo, Button } from "@/lib/ui";

export default function InvalidPage() {
  return (
    <Shell>
      <div className="mb-8 text-center">
        <Logo size="lg" />
      </div>

      <Card className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Invalid QR Code</h1>
        <p className="text-gray-500 text-sm mb-6">
          This QR code doesn't exist in our system. It may be fake, damaged, or tampered with.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-600 mb-6 space-y-1">
          <p className="font-medium text-gray-700 mb-2">Possible reasons:</p>
          <p>• The sticker was not issued by SafeScan</p>
          <p>• The QR code is damaged or unreadable</p>
          <p>• The URL was manually typed incorrectly</p>
        </div>

        <Link href="/">
          <Button variant="secondary" className="w-full">Go to homepage</Button>
        </Link>
      </Card>
    </Shell>
  );
}