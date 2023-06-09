import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment.development'; //Local environment variables file - in gitignore 

const params = new URLSearchParams(window.location.search);
const code: any = params.get("code");
const clientId = environment.clientId;

@Component({
  selector: 'spotify-listening-trends-auth-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-component.component.html',
  styleUrls: ['./auth-component.component.scss'],
})
export class AuthComponentComponent {
  async ngOnInit() {
    if (!code) {
      this.redirectToAuthCodeFlow(clientId);
    }
    else {
      const accessToken = await this.getAccessToken(clientId, code);  
      const profile = await this.fetchProfile(accessToken);
      console.log(profile);
    }
  }

  async redirectToAuthCodeFlow(clientId: string) {    //GET request to /authorize with permission list 
    const verifier = this.generateCodeVerifier(128);
    const challenge = await this.generateCodeChallenge(verifier);
    const state = this.generateCodeVerifier(16);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("state", state);
    params.append("redirect_uri", "http://localhost:4200/callback");
    params.append("scope", "user-read-private user-read-email playlist-read-private playlist-read-collaborative");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  generateCodeVerifier(length: number) {     //PKCE Cryptographic String -> input between 43-128
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  async generateCodeChallenge(codeVerifier: string) {    //SHA Hash of random string
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
  }

  async getAccessToken(clientId: string, code: string): Promise<string> { //Gets token using auth code
    const verifier = localStorage.getItem("verifier");    
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:4200/callback");
    params.append("code_verifier", verifier!);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
  }

 async fetchProfile(token: string): Promise<any> {  //gets account summary
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}
}
