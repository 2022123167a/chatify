const router=require("express").Router();
const User=require("../models/User");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");

router.post("/register",async(req,res)=>{
 const {kullaniciAdi,sifre}=req.body;
 if(!kullaniciAdi||!sifre) return res.status(400).json({mesaj:"Eksik bilgi"});
 const varmi=await User.findOne({kullaniciAdi});
 if(varmi) return res.status(400).json({mesaj:"Kullanici var"});
 const hash=await bcrypt.hash(sifre,10);
 const u=await User.create({kullaniciAdi,sifre:hash});
 res.json({mesaj:"Olusturuldu",kullanici:{id:u._id,kullaniciAdi}});
});

router.post("/login",async(req,res)=>{
 const {kullaniciAdi,sifre}=req.body;
 const u=await User.findOne({kullaniciAdi});
 if(!u) return res.status(400).json({mesaj:"Bulunamadi"});
 const dogru=await bcrypt.compare(sifre,u.sifre);
 if(!dogru) return res.status(400).json({mesaj:"Sifre hatali"});
 const token=jwt.sign({id:u._id,kullaniciAdi},process.env.JWT_SECRET,{expiresIn:"7d"});
 res.json({mesaj:"Giris basarili",token,kullanici:{id:u._id,kullaniciAdi}});
});

module.exports=router;
