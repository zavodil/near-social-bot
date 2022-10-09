import 'bootstrap/dist/css/bootstrap.min.css';
import {Globe2, Twitter, Telegram, Github} from 'react-bootstrap-icons';
import {Container, Row, Col, Form} from 'react-bootstrap';
import './App.css';
import * as NearApi from 'near-api-js'

import {useIsTelegramWebAppReady, useTelegramWebApp} from 'react-telegram-webapp';
import {useEffect, useState} from "react";
import {useNearContract} from "react-near";
import {loadNativeBalance, getSignUrl} from "./near";

function useContract() {
    return useNearContract("social.near", {
        viewMethods: ["get"],
        changeMethods: [],
    });
}

const Steps = {
    Init: "Init",
    InputAccount: "InputAccount",
    FillForm: "FillForm",
    SignUrl: "SignUrl",
    InvalidAccount: "InvalidAccount",
    Loading: "Loading"
};

function App() {
    const nearContract = useContract();
    const [step, setStep] = useState(Steps.Init);
    const [nearAccount, setNearAccount] = useState("");
    const [signUrl, setSignUrl] = useState("");

    const [socialName, setSocialName] = useState("");
    const [pictureUrl, setPictureUrl] = useState("");
    const [telegramUsername, setTelegramUsername] = useState("");
    const [twitterUsername, setTwitterUsername] = useState("");
    const [githubAccount, setGithubAccount] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");

    const telegram = useTelegramWebApp();
    const isTelegramWebAppReady = useIsTelegramWebAppReady();

    const updateNearAccountTextBox = (value) => {
        setNearAccount(value)

        const isValid = (value.length === 64 || value.endsWith(".near"));
        if (isValid && step === Steps.Init) {
            setStep(Steps.InputAccount)
            telegram.MainButton.show();
        } else {
            setStep(Steps.Init)
            telegram.MainButton.hide();
        }
    }

    const createSignUrl = (socialName, pictureUrl, telegramUsername, twitterUsername, githubAccount, websiteUrl) => {
        if (step !== Steps.FillForm)
            return;

        setStep(Steps.Loading);

        let args = {
            data: {
                [nearAccount]: {
                    profile: {
                        name: socialName,
                        image: {
                            url: pictureUrl
                        },
                        linktree: {
                            telegram: telegramUsername,
                            twitter: twitterUsername,
                            github: githubAccount,
                            website: websiteUrl
                        }
                    }
                }
            }
        };

        getSignUrl(nearAccount, "set", args, NearApi.utils.format.parseNearAmount("0.03"), 50000000000000, "social.near")
            .then((url) => {
                console.log(url);
                setSignUrl(url);
                window.open(url.toString());
                setStep(Steps.SignUrl);
            });

    }

    const loadProfile = (account_id, socialName, pictureUrl, telegramUsername) => {
        if (step !== Steps.InputAccount)
            return;

        setStep(Steps.Loading);

        loadNativeBalance(account_id).then((balance) => {
            if (balance > 0) {
                nearContract.get({keys: [`${account_id}/profile/**`]}).then(data => {
                    console.log(data)
                    if (data.hasOwnProperty(account_id) && data[account_id].hasOwnProperty("profile") && Object.keys(data[account_id].profile).length > 0) {
                        const account = data[account_id].profile;

                        setSocialName(account?.name || socialName);
                        setPictureUrl(account?.image?.url || pictureUrl);
                        setTelegramUsername(account?.linktree?.telegram || telegramUsername);

                        setTwitterUsername(account?.linktree?.twitter || "");
                        setGithubAccount(account?.linktree?.github || "");
                        setWebsiteUrl(account?.linktree?.website || "");
                    } else {
                        setSocialName(socialName);
                        setPictureUrl(pictureUrl);
                        setTelegramUsername(telegramUsername);
                    }
                    setStep(Steps.FillForm)
                });
            } else {
                setStep(Steps.InvalidAccount)
            }
        });
    }

    const handleMainButtonClick = (step, nearAccount, socialName, pictureUrl, telegramUsername, twitterUsername, githubAccount, websiteUrl) => {
        if (isTelegramWebAppReady) {
            telegram.MainButton.disable();

            switch (step) {
                case Steps.InputAccount:
                    const profile = telegram.initDataUnsafe.user;
                    loadProfile(nearAccount, `${profile.first_name} ${profile.last_name}`.trim(), profile.photo_url, profile.username)

                    telegram.MainButton.text = "Continue";
                    telegram.MainButton.enable();
                    break;

                case Steps.FillForm:
                    createSignUrl(socialName, pictureUrl, telegramUsername, twitterUsername, githubAccount, websiteUrl)

                    telegram.MainButton.text = "Submit";
                    telegram.MainButton.enable();
                    break;

                case Steps.SignUrl:
                    telegram.close()
                    break;

                case Steps.Loading:
                    telegram.MainButton.text = "Loading...";
                    break;

                default:
                    console.log("Unknown step " + step)
            }
        }
    }

    useEffect(() => {
        if (isTelegramWebAppReady) {

            const f = () => handleMainButtonClick(step, nearAccount, socialName, pictureUrl, telegramUsername, twitterUsername, githubAccount, websiteUrl);
            telegram.onEvent("mainButtonClicked", f);

            return () => telegram.offEvent("mainButtonClicked", f);
        }

    }, [isTelegramWebAppReady, step, nearAccount, socialName, pictureUrl, telegramUsername, twitterUsername, githubAccount, websiteUrl])

    return (
        <>
            {step === Steps.Loading && <Container>Loading...</Container>}
            {(step === Steps.Init || step === Steps.InputAccount || step === Steps.InvalidAccount) &&
            <Container fluid>
                <Row>
                    <Col>
                        <Form onSubmit={e => {
                            e.preventDefault();
                        }}>
                            <Form.Group className="mb-3">
                                <Form.Label>Your NEAR account:</Form.Label>
                                <Form.Control type="text" placeholder="Input your NEAR Account" value={nearAccount}
                                              onChange={(event) => updateNearAccountTextBox((event.target.value || "").toLowerCase())}/>
                                <Form.Text className="text-muted">
                                    Named of Implicit account needed.
                                </Form.Text>

                                {step === Steps.InvalidAccount && <div className="warning">Invalid account</div>}
                            </Form.Group>
                        </Form>

                    </Col>
                </Row>
            </Container>}

            {step === Steps.FillForm && <Container fluid>
                <h4>Edit your Near Social Profile:</h4>
                <Row>
                    <Col>
                        <Form onSubmit={e => {
                            e.preventDefault();
                        }}>
                            <Form.Group className="mb-3">
                                <Form.Label>Name:</Form.Label>
                                <Form.Control type="text" value={socialName}
                                              onChange={(event) => setSocialName(event.target.value)}/>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Photo:</Form.Label>
                                <Form.Control type="text" value={pictureUrl}
                                              onChange={(event) => setPictureUrl(event.target.value)}/>
                                <Form.Text className="text-muted">
                                    Image URL or IPFS hash.
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Telegram account:</Form.Label>
                                <Form.Control type="text" value={telegramUsername}
                                              onChange={(event) => setTelegramUsername((event.target.value || "").toLowerCase())}/>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Twitter account:</Form.Label>
                                <Form.Control type="text" value={twitterUsername}
                                              onChange={(event) => setTwitterUsername((event.target.value || "").toLowerCase())}/>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Website:</Form.Label>
                                <Form.Control type="text" value={websiteUrl}
                                              onChange={(event) => setWebsiteUrl((event.target.value || "").toLowerCase())}/>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Github account:</Form.Label>
                                <Form.Control type="text" value={githubAccount}
                                              onChange={(event) => setGithubAccount((event.target.value || "").toLowerCase())}/>
                            </Form.Group>
                        </Form>

                    </Col>
                </Row>

                <Row>
                    <Col>
                        <h4>Preview: </h4>
                        <div className="mb-3">
                            <div className="d-inline-block position-relative overflow-hidden">
                                <div className="profile">
                                    <div className="profile-image float-start me-2">
                                        <img className="rounded w-100 h-100"
                                             src={pictureUrl ? pictureUrl : "https://i.near.social/thumbnail/https://thewiki.io/static/media/sasha_anon.6ba19561.png"}
                                             alt="profile image"/>
                                    </div>
                                    <div className="profile-info d-inline-block">
                                        <div className="profile-name text-truncate">
                                            {socialName}
                                        </div>
                                        <div className="profile-links d-flex">
                                            <div
                                                className="d-inline-block profile-account text-secondary text-truncate">
                                                @{nearAccount}
                                            </div>
                                            {websiteUrl && <div className="ms-1 d-inline-block">
                                                <a href={`javascript:window.open("${websiteUrl}")`} className={"icon"}>
                                                    <Globe2 size={16}/>
                                                </a>
                                            </div>}
                                            {githubAccount && <div className="ms-1 d-inline-block">
                                                <a href={`javascript:window.open("https://github.com/${githubAccount}")`}
                                                   className={"icon"}>
                                                    <Github size={16}/>
                                                </a>
                                            </div>}
                                            {twitterUsername && <div className="ms-1 d-inline-block">
                                                <a href={`javascript:window.open("https://twitter.com/${twitterUsername}")`}
                                                   className={"icon"}>
                                                    <Twitter size={16}/>
                                                </a>
                                            </div>}
                                            {telegramUsername && <div className="ms-1 d-inline-block">
                                                <a href={`javascript:window.open("https://t.me/${telegramUsername}")`}
                                                   className={"icon"}>
                                                    <Telegram size={16}/>
                                                </a>
                                            </div>}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>}

            {step === Steps.SignUrl && <Container>
                <Row>
                    <Col>
                        <div>
                            Please sign the transaction in Near Wallet on behalf of {nearAccount}.
                        </div>
                        <div>
                            If popup window was blocked, please follow the link: <a
                            href={`javascript:window.open("${encodeURIComponent(signUrl)}");`}
                            className={"wallet-link"}>{signUrl}</a>
                        </div>
                    </Col>
                </Row>
            </Container>}
        </>
    );
}

export default App;

