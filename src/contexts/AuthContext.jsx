import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    onAuthStateChanged
} from "firebase/auth";

import {
    doc,
    getDoc
} from "firebase/firestore";


import { auth, db } from "../firebase/firebase";


const AuthContext = createContext();


export function AuthProvider({children}){


const [user,setUser] = useState(null);
const [loading,setLoading] = useState(true);



useEffect(()=>{


const unsubscribe = onAuthStateChanged(
auth,
async(firebaseUser)=>{


if(firebaseUser){


const userDoc =
await getDoc(
doc(
db,
"users",
firebaseUser.uid
)
);



if(userDoc.exists()){


setUser({

uid: firebaseUser.uid,

...userDoc.data()

});


}


}
else{

setUser(null);

}


setLoading(false);


});


return ()=>unsubscribe();


},[]);



return(

<AuthContext.Provider
value={{user,loading}}
>

{children}

</AuthContext.Provider>


);


}


export function useAuth(){

return useContext(AuthContext);

}