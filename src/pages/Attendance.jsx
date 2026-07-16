import DashboardLayout from "../components/layout/DashboardLayout";


import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

function Attendance() {

    const [attendance, setAttendance] = useState([]);

    useEffect(() => {

        async function fetchAttendance() {

            const snapshot = await getDocs(collection(db, "attendance"));

            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(data);

            setAttendance(data);
        }

        fetchAttendance();

    }, []);

    return (
        <div>

            <h1>BioSYnc Attendance Records</h1>
            <p>Attendance logs and tracking records will show up here.</p>

            {attendance.map(record => (

                <div key={record.id}>

                    <p>User ID: {record.usedId}</p>

                    <p>Method: {record.authMethod}</p>

                    <p>Status: {record.status}</p>

                    <hr />

                </div>

            ))}

        </div>
    );
}

export default Attendance;