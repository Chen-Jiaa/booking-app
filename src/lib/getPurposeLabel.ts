export function getPurposeLabel(value: string) {
    const purposeOptions = [
        { label: "Connect Group", value: "connect_group" },
        { label: "Combine Connect Group", value: "combine_connect_group" },
        { label: "Bible Study", value: "bible_study" },
        { label: "Prayer Meeting", value: "prayer_meeting" },
        { label: "Zone Meeting", value: "zone_meeting" },
        { label: "Practice (Email Admin for approval)", value: "practice" },
        { label: "Event (Email Admin for approval)", value: "event" },
        { label: "Others", value: "others" },
    ]

    const option = purposeOptions.find((opt) => opt.value === value)
    return option?.label ?? value
}