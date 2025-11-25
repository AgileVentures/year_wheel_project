// DayDialog.jsx

import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";

/**
 * DayDialog Component
 *
 * @param {boolean} isOpen - Whether the dialog is open
 * @param {function} onClose - Callback to close the dialog
 * @param {Date} day - The date object representing the selected day
 * @param {Array} appointments - List of appointments for the selected day
 */
const DayDialog = ({ isOpen, onClose, day, appointments = [] }) => {
  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {/* Header */}
        <DialogHeader>
          <div className="text-lg font-bold">
            Details for{" "}
            {new Date(day).toLocaleDateString("sv-SE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </DialogHeader>

        {/* Body */}
        <DialogBody>
          <div className="flex flex-col items-start space-y-4">
            <div className="font-bold">Appointments:</div>

            {appointments.length > 0 ? (
              appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-3 border border-gray-200 rounded-sm bg-gray-50 w-full shadow-sm"
                >
                  <div className="font-bold">
                    Time:{" "}
                    {new Date(appointment.datetime).toLocaleTimeString("sv-SE")}
                  </div>
                  <div>
                    Guest: {appointment.client.first_name}{" "}
                    {appointment.client.last_name}
                  </div>
                </div>
              ))
            ) : (
              <div>No appointments for this day.</div>
            )}
          </div>
        </DialogBody>

        {/* Footer */}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default DayDialog;