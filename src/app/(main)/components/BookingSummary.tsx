import { Card, CardContent } from "@/components/ui/card";
import { Rooms } from "@/db/schema";
import { format } from "date-fns";



interface BookingSummaryProps {
    date?: Date;
    endTime?: string;
    selectedRoom: null | Rooms;
    startTime?: string;
  }

export default function BookingSummary(props: BookingSummaryProps) {
    const {date, endTime, selectedRoom, startTime,} = props
    
    return (
        <Card>
            <CardContent className="rounded-lg">
                <div className="pt-6">
                    <h3 className="font-medium text-lg mb-2">
                    Booking Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Rooms</p>
                        <p className="font-medium">{selectedRoom?.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">
                        {date
                            ? format(date, "EEEE, MMMM d, yyyy")
                            : ""}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-medium">{startTime} - {endTime}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">
                            {startTime && endTime
                                ? `${String(
                                    Number.parseInt(endTime.split(":")[0]) * 60 +
                                    Number.parseInt(endTime.split(":")[1]) -
                                    (Number.parseInt(startTime.split(":")[0]) *
                                    60 +
                                    Number.parseInt(startTime.split(":")[1]))
                                )} minutes`
                            : ""}
                        </p>
                    </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}