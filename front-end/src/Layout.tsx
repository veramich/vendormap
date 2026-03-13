import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import Header from "./Header";

export default function Layout() {
    return (
        <>
        <Header />
        <Outlet />
        <NavBar />
        </>
    )
}