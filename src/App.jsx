import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Company from './pages/Company';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Species from './pages/Species';
import News from './pages/News';
import Contact from './pages/Contact';
import Webstore from './pages/Webstore';
import './index.css';
import './App.css';

function ScrollToTop(){const{pathname}=useLocation();useEffect(()=>{window.scrollTo(0,0);},[pathname]);return null;}
function NotFound(){return(<div style={{textAlign:'center',padding:'100px 24px'}}><h1 style={{fontSize:'3.5rem',fontWeight:800,color:'var(--green)'}}>404</h1><p style={{color:'var(--text-mid)',marginBottom:'20px'}}>Page not found.</p><a href="/" style={{color:'var(--green)',fontWeight:600}}>Return to Home</a></div>);}

function Layout(){return(
  <div className="app-layout">
    <Navbar/>
    <div className="app-content">
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/company" element={<Company/>}/>
        <Route path="/products" element={<Products/>}/>
        <Route path="/products/:id" element={<ProductDetail/>}/>
        <Route path="/species" element={<Species/>}/>
        <Route path="/news" element={<News/>}/>
        <Route path="/contact" element={<Contact/>}/>
        <Route path="/shop" element={<Webstore/>}/>
        <Route path="*" element={<NotFound/>}/>
      </Routes>
    </div>
    <Footer/>
  </div>
);}

export default function App(){return(<BrowserRouter><ScrollToTop/><Layout/></BrowserRouter>);}
