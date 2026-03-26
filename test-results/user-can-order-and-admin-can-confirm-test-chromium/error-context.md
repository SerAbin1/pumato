# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e6]
      - heading "Admin Login" [level=1] [ref=e9]
      - paragraph [ref=e10]: Enter your credentials to access the dashboard
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: Email Address
        - generic [ref=e14]:
          - img [ref=e15]
          - textbox "admin@example.com" [ref=e18]: testadmin@pumato.online
      - generic [ref=e19]:
        - generic [ref=e20]: Password
        - generic [ref=e21]:
          - img [ref=e22]
          - textbox "••••••••" [ref=e25]: testadminpass
          - button [ref=e26]:
            - img [ref=e27]
      - button "Sign In" [ref=e30]:
        - img [ref=e31]
        - text: Sign In
    - paragraph [ref=e34]: Protected admin area • Authorized personnel only
  - generic [ref=e39] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e40]:
      - img [ref=e41]
    - generic [ref=e44]:
      - button "Open issues overlay" [ref=e45]:
        - generic [ref=e46]:
          - generic [ref=e47]: "0"
          - generic [ref=e48]: "1"
        - generic [ref=e49]: Issue
      - button "Collapse issues badge" [ref=e50]:
        - img [ref=e51]
  - alert [ref=e53]
```